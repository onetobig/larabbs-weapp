import wepy from 'wepy'
import api from '@/utils/api'
import util from '@/utils/util'

export default class ReplyMixin extends wepy.mixin {
  config = {
    // 可以下拉刷新
    enablePullDownRefresh: true
  }

  data = {
    // 回复数据
    replies: [],
    noMoreData: false,
    isLoading: false,
    page: 1,
  }

  async getReplies(reset = false) {
    try {
      let repliesResponse = await api.request({
        url: this.requestData.url,
        data: {
          page: this.page,
          include: this.requestData.include || 'user'
        }
      })

      if (repliesResponse.statusCode === 200) {
        let replies = repliesResponse.data.data

        let user = await this.$parent.getCurrentUser()
        let node = this
        replies.forEach(function (reply) {
          reply.created_at_diff = util.diffForHumans(reply.created_at)
          reply.can_delete = node.canDelete(user, reply)
        })

        this.replies = reset ? replies : this.replies.concat(replies)

        let pagination = repliesResponse.data.meta.pagination

        if (pagination.current_page === pagination.total_pages) {
          this.noMoreData = true
        }

        this.$apply()
      }

      return repliesResponse
    } catch (err) {
      api.showErrorModal(err)
    }
  }

  canDelete(user, reply) {
    if (!user) {
      return false
    }

    return (reply.user_id === user.id || this.$parent.can('manage_contents'))
  }

  async onPullDownRefresh() {
    this.noMoreData = false
    this.page = 1
    await this.getReplies(true)
    wepy.stopPullDownRefresh()
  }

  async onReachBottom() {
    if (this.noMoreData || this.isLoading) {
      return false
    }
// 设置为加载中
    this.isLoading = true
    this.page = this.page + 1
    await this.getReplies()
    this.isLoading = false
    this.$apply()
  }

  methods = {
    async deleteReply(topicId, replyId) {
      let res = await wepy.showModal({
        title: '确认删除',
        content: '您确认删除该回复吗',
        confirmText: '删除',
        cancelText: '取消'
      })

      if (!res.confirm) {
        return
      }
      try {
        let deleteResponse = await api.authRequest({
          url: 'topics/' + topicId + '/replies/' + replyId,
          method: 'DELETE'
        })

        if (deleteResponse.statusCode === 204) {
          wepy.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 2000
          })

          // 移除已删除的回复
          this.replies = this.replies.filter((reply) => reply.id !== replyId)
          this.$apply()

          return deleteResponse
        }
      } catch (err) {
        api.showErrorModal(err)
      }
    }
  }
}
